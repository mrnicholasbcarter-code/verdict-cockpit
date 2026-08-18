import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Home from '../src/pages/index';
import { useRoutingStore } from '../src/lib/routingStore';

jest.mock('next/head', () => {
  return function Head({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
});

describe('Dashboard (Home) — AI Routing Cockpit', () => {
  beforeEach(() => {
    useRoutingStore.getState().setPolicyGate('cost-aware');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the header with portfolio routing copy', () => {
    render(<Home />);
    expect(screen.getByText('Policy-Gated Model Router')).toBeInTheDocument();
    expect(screen.getByText('Verdict AI Routing Cockpit')).toBeInTheDocument();
  });

  it('labels the dashboard as demo data (no live API)', () => {
    render(<Home />);
    expect(screen.getByText('Demo Data')).toBeInTheDocument();
  });

  it('shows the selected model and cost-aware policy copy', () => {
    render(<Home />);
    expect(screen.getByText('Selected routing decision')).toBeInTheDocument();
    expect(screen.getAllByText('cost-aware').length).toBeGreaterThanOrEqual(1);
  });

  it('lists rejected candidates with reasons', () => {
    render(<Home />);
    expect(screen.getByText('Why not selected')).toBeInTheDocument();
    const reasons = screen.getAllByText(/exceeds|threshold|score|floor|insufficient|below|composite/i);
    expect(reasons.length).toBeGreaterThanOrEqual(1);
  });

  it('changes policy gate and re-renders routing decision', () => {
    render(<Home />);
    const select = screen.getByLabelText('Select policy gate') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'quality-first' } });
    expect(useRoutingStore.getState().policyGate).toBe('quality-first');
    expect(screen.getAllByText('quality-first').length).toBeGreaterThanOrEqual(1);
  });

  it('shows provider health and fallback status', () => {
    render(<Home />);
    expect(screen.getByText('Provider health & freshness')).toBeInTheDocument();
    expect(screen.getAllByText('OpenAI').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Recent routing decisions')).toBeInTheDocument();
  });
});
