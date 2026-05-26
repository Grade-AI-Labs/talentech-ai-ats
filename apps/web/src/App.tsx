import { useState } from 'react';
import { JobsPage } from './pages/JobsPage.js';
import { CandidatesPage } from './pages/CandidatesPage.js';

type Tab = 'jobs' | 'candidates';

const TABS: { id: Tab; label: string }[] = [
  { id: 'jobs', label: 'Jobs' },
  { id: 'candidates', label: 'Candidates' },
];

export function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('jobs');

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Talentech AI ATS</h1>
        <p className="app__subtitle">Workshop demo application</p>
      </header>
      <nav className="tabs" aria-label="Sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={
              'tabs__button' +
              (activeTab === tab.id ? ' tabs__button--active' : '')
            }
            aria-current={activeTab === tab.id ? 'page' : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <main>
        {activeTab === 'jobs' && <JobsPage />}
        {activeTab === 'candidates' && <CandidatesPage />}
      </main>
    </div>
  );
}
