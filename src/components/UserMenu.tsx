import { useState, useEffect, useRef } from 'react';
import { useAuth, getDisplayName, getAvatarUrl, getAvatarId, getCustomAvatarUrl } from '../contexts/AuthContext';
import { getAvatarSrc } from '../utils/avatarMap';
import ProfileModal from './ProfileModal';
import './UserMenu.css';

interface UserMenuProps {
  onSignInClick: () => void;
}

export default function UserMenu({ onSignInClick }: UserMenuProps) {
  const { user, loading, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  // Don't show anything while checking session
  if (loading) return null;

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
  };

  const handleProfileClick = () => {
    setDropdownOpen(false);
    setShowProfile(true);
  };

  if (!user) {
    return (
      <button className="sign-in-button" onClick={onSignInClick}>
        Sign In
      </button>
    );
  }

  const displayName = getDisplayName(user);
  const avatarId = getAvatarId(user);
  const presetAvatarSrc = getAvatarSrc(avatarId);
  const uploadedAvatarUrl = getCustomAvatarUrl(user);
  const googleAvatarUrl = getAvatarUrl(user);

  // Priority: preset avatar > uploaded avatar > Google avatar > default user icon
  const avatarSrc = presetAvatarSrc
    || (avatarId === 'custom' ? uploadedAvatarUrl : null)
    || googleAvatarUrl;

  const avatarElement = avatarSrc ? (
    <img className="user-avatar-img" src={avatarSrc} alt="" />
  ) : (
    <span className="user-avatar-initial">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </span>
  );

  return (
    <>
      <div className="user-menu" ref={menuRef}>
        <button
          className="user-menu-trigger"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          title={user.email ?? 'Account'}
        >
          {avatarElement}
          <span className="user-display-name">{displayName}</span>
        </button>

        {dropdownOpen && (
          <div className="user-dropdown">
            <div className="user-dropdown-header">
              <div className="user-dropdown-name">{displayName}</div>
              <div className="user-dropdown-email">{user.email}</div>
            </div>
            <div className="user-dropdown-actions">
              <button className="dropdown-action-btn" onClick={handleProfileClick}>
                Profile
              </button>
              <button className="sign-out-button" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </>
  );
}
