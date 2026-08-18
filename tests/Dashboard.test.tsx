import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Home from '../src/pages/index';
import { useRouteLabStore } from '../src/lib/routeLabStore';

jest.mock('next/head', () => function Head({ children }: { children: React.ReactNode }) { return <>{children}</>; });

const initialState = useRouteLabStore.getState();

describe('AutoDev Route Lab dashboard', () => {
  beforeEach(() => {
    useRouteLabStore.setState({ reports: initialState.reports, currentReportId: 'tcr-authz-accepted', loadError: null });
  });

  it('labels fixture mode and route ownership explicitly', () => {
    render(<Home />);
    expect(screen.getByText('Deterministic fixture')).toBeInTheDocument();
    expect(screen.getByText('No live API calls')).toBeInTheDocument();
    expect(screen.getByText('Served by OmniRoute')).toBeInTheDocument();
    expect(screen.getByText(/Verdict did not select or score/)).toBeInTheDocument();
  });

  it('renders exact source and independent acceptance evidence', () => {
    render(<Home />);
    expect(screen.getAllByText('c91e8ab').length).toBeGreaterThan(0);
    expect(screen.getByText('7ba921c')).toBeInTheDocument();
    expect(screen.getByText('Independent regression suite')).toBeInTheDocument();
    expect(screen.getByText('147 passed, exit 0')).toBeInTheDocument();
  });

  it('shows advisory route lifecycle semantics without promotion controls', () => {
    render(<Home />);
    expect(screen.getByText('Advisory only')).toBeInTheDocument();
    expect(screen.getByText(/cannot authorize a mutation or self-promote/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /promote/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /model/i })).not.toBeInTheDocument();
  });

  it('keeps acceptance unknown when independent evidence is stale', () => {
    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: /Unknown candidate/ }));
    expect(screen.getAllByText('unknown').length).toBeGreaterThan(0);
    expect(screen.getByText(/Receipt exceeded the 24-hour freshness window/)).toBeInTheDocument();
    expect(screen.getByText('0 failed; 1 unresolved')).toBeInTheDocument();
  });

  it('switches to a denied report and explains the blocking evidence', () => {
    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: /Denied candidate/ }));
    expect(screen.getAllByText('denied').length).toBeGreaterThan(0);
    expect(screen.getByText('Protected config/policy.ts was modified')).toBeInTheDocument();
    expect(screen.getByText(/passing tests cannot override boundary denial/)).toBeInTheDocument();
  });
});
