import { useState, useEffect, useRef } from 'react';
import { useAuth, getDisplayName, getAvatarUrl, getAvatarId, getCustomAvatarUrl, hasRegolithApiKeySupabase } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AVATAR_OPTIONS, getAvatarSrc } from '../utils/avatarMap';
import { getRegolithApiKeyLocal, saveRegolithApiKeyLocal, clearRegolithApiKeyLocal } from '../utils/storage';
import { validateApiKey } from '../utils/regolith';
import { encryptForSupabase } from '../utils/apiKeyCrypto';
import './ProfileModal.css';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Max avatar dimensions (resized on upload) */
const AVATAR_SIZE = 128;
/** Max file size before resize (5MB) */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Resize an image file to a square JPEG data URL.
 * The image is scaled to fit within AVATAR_SIZE x AVATAR_SIZE,
 * centered on a transparent canvas, then exported as JPEG.
 */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }

      // Scale to fit, center in square
      const scale = Math.min(AVATAR_SIZE / img.width, AVATAR_SIZE / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (AVATAR_SIZE - w) / 2;
      const y = (AVATAR_SIZE - h) / 2;

      ctx.drawImage(img, x, y, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('Failed to load image')); };
    img.src = URL.createObjectURL(file);
  });
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'integrations'>('profile');

  // Profile tab state
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Integrations tab state
  const [regolithKeyInput, setRegolithKeyInput] = useState('');
  const [regolithStorage, setRegolithStorage] = useState<'local' | 'account'>('local');
  const [regolithSaving, setRegolithSaving] = useState(false);
  const [regolithError, setRegolithError] = useState('');
  const [regolithSuccess, setRegolithSuccess] = useState('');

  const localKey = getRegolithApiKeyLocal();
  const hasAccountKey = hasRegolithApiKeySupabase(user);
  const isRegolithConnected = !!(localKey || hasAccountKey);
  const regolithStorageLabel = hasAccountKey ? 'PeaceFrog Gaming account' : localKey ? 'This browser' : null;

  // Populate fields when modal opens; reset tab to default on each open
  useEffect(() => {
    if (isOpen && user) {
      setActiveTab('profile');
      setDisplayName(getDisplayName(user));
      setSelectedAvatar(getAvatarId(user));
      setUploadedPreview(getCustomAvatarUrl(user));
      setNewEmail(user.email ?? '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
      setRegolithKeyInput('');
      setRegolithError('');
      setRegolithSuccess('');
    }
  }, [isOpen, user]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const googleAvatarUrl = getAvatarUrl(user);

  // Determine displayed avatar based on selection
  const presetAvatarSrc = getAvatarSrc(selectedAvatar);
  const displayedAvatar = presetAvatarSrc
    || (selectedAvatar === 'custom' ? uploadedPreview : null)
    || googleAvatarUrl;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so same file can be re-selected
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Image must be under 5MB.');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const dataUrl = await resizeImage(file);
      setUploadedPreview(dataUrl);
      setSelectedAvatar('custom');
    } catch {
      setError('Failed to process image.');
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    // Validate
    if (!displayName.trim()) {
      setError('Display name cannot be empty.');
      return;
    }

    if (!newEmail.trim()) {
      setError('Email cannot be empty.');
      return;
    }

    if (newPassword && newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Require current password to change email or password
    const emailChanged = newEmail.trim() !== user.email;
    if ((emailChanged || newPassword) && !currentPassword) {
      setError('Current password is required to change email or password.');
      return;
    }

    setSaving(true);

    // Verify current password before allowing email/password changes
    if ((emailChanged || newPassword) && currentPassword) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });
      if (verifyError) {
        setError('Current password is incorrect.');
        setSaving(false);
        return;
      }
    }

    // Save avatar and display name together (both are user metadata)
    const currentAvatarId = getAvatarId(user);
    const currentDisplayName = getDisplayName(user);
    const avatarChanged = selectedAvatar !== currentAvatarId;
    const nameChanged = displayName.trim() !== currentDisplayName;
    const customAvatarChanged = selectedAvatar === 'custom' && uploadedPreview !== getCustomAvatarUrl(user);

    if (avatarChanged || nameChanged || customAvatarChanged) {
      const data: Record<string, string | null> = {};
      if (avatarChanged || customAvatarChanged) {
        data.avatar_id = selectedAvatar;
        data.custom_avatar = selectedAvatar === 'custom' ? uploadedPreview : null;
      }
      if (nameChanged) data.display_name = displayName.trim();

      const { error: metaError } = await supabase.auth.updateUser({ data });
      if (metaError) {
        setError(metaError.message);
        setSaving(false);
        return;
      }
    }

    // Save email if changed
    if (newEmail.trim() !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });
      if (emailError) {
        setError(emailError.message);
        setSaving(false);
        return;
      }
    }

    // Save password if provided
    if (newPassword) {
      const { error: passError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (passError) {
        setError(passError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onClose();
  };

  const handleRegolithSave = async () => {
    if (!regolithKeyInput.trim()) {
      setRegolithError('Please enter your Regolith API key.');
      return;
    }
    setRegolithSaving(true);
    setRegolithError('');
    setRegolithSuccess('');

    const valid = await validateApiKey(regolithKeyInput.trim());
    if (!valid) {
      setRegolithError('Invalid API key — could not connect to Regolith.');
      setRegolithSaving(false);
      return;
    }

    if (regolithStorage === 'account' && user) {
      const encrypted = await encryptForSupabase(regolithKeyInput.trim(), user.id);
      const { error: saveError } = await supabase.auth.updateUser({
        data: { regolith_api_key: encrypted },
      });
      if (saveError) {
        setRegolithError(saveError.message);
        setRegolithSaving(false);
        return;
      }
    } else {
      saveRegolithApiKeyLocal(regolithKeyInput.trim());
    }

    setRegolithKeyInput('');
    setRegolithSuccess(`Connected! Key saved to ${regolithStorage === 'account' ? 'your PeaceFrog Gaming account' : 'this browser'}.`);
    setRegolithSaving(false);
  };

  const handleRegolithDisconnect = async () => {
    clearRegolithApiKeyLocal();
    if (user) {
      await supabase.auth.updateUser({ data: { regolith_api_key: null } });
    }
    setRegolithSuccess('Disconnected from Regolith.');
    setRegolithError('');
  };

  return (
    <div className="profile-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <div className="profile-modal">
        <button className="close-button" onClick={onClose}>×</button>

        <h2 id="profile-modal-title">Profile</h2>

        {/* Tab Navigation */}
        <div className="profile-tabs">
          <button
            className={`profile-tab${activeTab === 'profile' ? ' active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            className={`profile-tab${activeTab === 'integrations' ? ' active' : ''}`}
            onClick={() => setActiveTab('integrations')}
          >
            Integrations
            {isRegolithConnected && <span className="profile-tab-badge" />}
          </button>
        </div>

        {activeTab === 'profile' && (<>

        {/* Avatar Display */}
        <div className="profile-avatar-display">
          {displayedAvatar ? (
            <img className="profile-avatar-img" src={displayedAvatar} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span className="profile-avatar-initial">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
          )}
        </div>

        {/* Avatar Selection */}
        <div className="profile-avatar-section">
          <div className="profile-avatar-label">Choose Avatar</div>
          <div className="profile-avatar-options">
            <button
              className={`profile-avatar-option${!selectedAvatar ? ' selected' : ''}`}
              onClick={() => { setSelectedAvatar(null); setError(''); setSuccess(''); }}
              title="Default"
              disabled={saving}
            >
              {googleAvatarUrl ? (
                <img src={googleAvatarUrl} alt="" referrerPolicy="no-referrer" />
              ) : (
                <svg className="avatar-default-icon" viewBox="0 0 24 24" width="32" height="32" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </button>
            {AVATAR_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`profile-avatar-option${selectedAvatar === opt.id ? ' selected' : ''}`}
                onClick={() => { setSelectedAvatar(opt.id); setError(''); setSuccess(''); }}
                title={opt.label}
                disabled={saving}
              >
                <img src={opt.src} alt={opt.label} />
              </button>
            ))}
            {/* Upload custom avatar */}
            {uploadedPreview ? (
              <button
                className={`profile-avatar-option${selectedAvatar === 'custom' ? ' selected' : ''}`}
                onClick={() => { setSelectedAvatar('custom'); setError(''); setSuccess(''); }}
                title="Uploaded"
                disabled={saving}
              >
                <img src={uploadedPreview} alt="Custom" />
              </button>
            ) : null}
            <button
              className="profile-avatar-option upload-option"
              onClick={() => fileInputRef.current?.click()}
              title="Upload image"
              disabled={saving}
            >
              +
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {error && <p className="profile-error">{error}</p>}
        {success && <p className="profile-success">{success}</p>}

        {/* Display Name */}
        <div className="profile-section">
          <div className="profile-field">
            <label htmlFor="profile-name">Display Name</label>
            <input
              id="profile-name"
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setError(''); setSuccess(''); }}
              required
              maxLength={50}
              disabled={saving}
            />
          </div>
        </div>

        {/* Email */}
        <div className="profile-section">
          <div className="profile-field">
            <label htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              type="email"
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setError(''); setSuccess(''); }}
              required
              disabled={saving}
            />
          </div>
        </div>

        {/* Password */}
        <div className="profile-section">
          <div className="profile-field">
            <label htmlFor="profile-current-password">Current Password</label>
            <input
              id="profile-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setError(''); setSuccess(''); }}
              placeholder="Required to change email or password"
              autoComplete="off"
              disabled={saving}
            />
          </div>
          <div className="profile-field">
            <label htmlFor="profile-new-password">New Password</label>
            <input
              id="profile-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(''); setSuccess(''); }}
              placeholder="At least 8 characters"
              minLength={8}
              autoComplete="new-password"
              disabled={saving}
            />
          </div>
          <div className="profile-field">
            <label htmlFor="profile-confirm-password">Confirm Password</label>
            <input
              id="profile-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); setSuccess(''); }}
              placeholder="Confirm new password"
              minLength={8}
              autoComplete="new-password"
              disabled={saving}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="profile-footer">
          <button className="profile-cancel-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="profile-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        </>)}

        {activeTab === 'integrations' && (
          <div className="profile-integrations">
            <div className="integration-card">
              <div className="integration-header">
                <div className="integration-title">
                  <span className="integration-name">Regolith</span>
                  <span className={`integration-status ${isRegolithConnected ? 'connected' : 'disconnected'}`}>
                    {isRegolithConnected ? `Connected · ${regolithStorageLabel}` : 'Not connected'}
                  </span>
                </div>
                <p className="integration-desc">
                  Import rock scans (mass, resistance, instability) directly from your active Regolith session.
                  Get your API key from your <a href="https://regolith.rocks" target="_blank" rel="noopener noreferrer">Regolith dashboard</a>.
                </p>
              </div>

              {!isRegolithConnected && (
                <>
                  <div className="profile-field">
                    <label htmlFor="regolith-key">API Key</label>
                    <input
                      id="regolith-key"
                      type="password"
                      value={regolithKeyInput}
                      onChange={(e) => { setRegolithKeyInput(e.target.value); setRegolithError(''); setRegolithSuccess(''); }}
                      placeholder="Paste your Regolith API key"
                      autoComplete="off"
                      disabled={regolithSaving}
                    />
                  </div>

                  <div className="regolith-storage-choice">
                    <p className="regolith-storage-label">Where should we store your key?</p>
                    <label className={`regolith-storage-option ${regolithStorage === 'local' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="regolith-storage"
                        value="local"
                        checked={regolithStorage === 'local'}
                        onChange={() => setRegolithStorage('local')}
                        disabled={regolithSaving}
                      />
                      <div>
                        <strong>This browser only</strong>
                        <ul>
                          <li>✅ Never leaves your browser — PeaceFrog Gaming cannot see it</li>
                          <li>⚠️ Only works on this browser/device</li>
                          <li>⚠️ May need re-entry after browser updates or cache clears</li>
                        </ul>
                      </div>
                    </label>
                    <label className={`regolith-storage-option ${regolithStorage === 'account' ? 'selected' : ''} ${!user ? 'disabled' : ''}`}>
                      <input
                        type="radio"
                        name="regolith-storage"
                        value="account"
                        checked={regolithStorage === 'account'}
                        onChange={() => setRegolithStorage('account')}
                        disabled={regolithSaving || !user}
                      />
                      <div>
                        <strong>My PeaceFrog Gaming account</strong>
                        {!user && <span className="regolith-requires-login"> (sign in required)</span>}
                        <ul>
                          <li>✅ Follows you across devices</li>
                          <li>✅ Tied to your PeaceFrog Gaming login</li>
                          <li>✅ Encrypted — PeaceFrog Gaming cannot view it in our database</li>
                        </ul>
                      </div>
                    </label>
                  </div>

                  {regolithError && <p className="profile-error">{regolithError}</p>}
                  {regolithSuccess && <p className="profile-success">{regolithSuccess}</p>}

                  <button
                    className="profile-save-btn"
                    onClick={handleRegolithSave}
                    disabled={regolithSaving || !regolithKeyInput.trim()}
                  >
                    {regolithSaving ? 'Connecting...' : 'Connect Regolith'}
                  </button>
                </>
              )}

              {isRegolithConnected && (
                <>
                  {regolithSuccess && <p className="profile-success">{regolithSuccess}</p>}
                  <button
                    className="profile-cancel-btn"
                    onClick={handleRegolithDisconnect}
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
