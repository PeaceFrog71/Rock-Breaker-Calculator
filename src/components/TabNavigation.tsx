import './TabNavigation.css';

export type TabType = 'overview' | 'mining';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="tab-navigation">
      <button
        className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
        onClick={() => onTabChange('overview')}
      >
        Overview
      </button>
      <button
        className={`tab-button ${activeTab === 'mining' ? 'active' : ''}`}
        onClick={() => onTabChange('mining')}
      >
        Ship Setup
      </button>
    </div>
  );
}
