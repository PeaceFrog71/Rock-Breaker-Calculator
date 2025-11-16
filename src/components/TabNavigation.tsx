import './TabNavigation.css';

export type TabType = 'overview' | 'rock' | 'mining';

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
        className={`tab-button ${activeTab === 'rock' ? 'active' : ''}`}
        onClick={() => onTabChange('rock')}
      >
        Rock Config
      </button>
      <button
        className={`tab-button ${activeTab === 'mining' ? 'active' : ''}`}
        onClick={() => onTabChange('mining')}
      >
        Mining Config
      </button>
    </div>
  );
}
