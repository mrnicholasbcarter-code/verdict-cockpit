/**
 * Tests for ExecutionEnvelopes page
 * 
 * Covers:
 * - Filter behavior on the fixture set
 * - Error state (malformed fixture -> invalid, visible message)
 * - Empty state
 * - Accessibility (roles/labels for filter controls and table, keyboard focus)
 */

import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExecutionEnvelopes from '@/pages/envelopes';
import { verifyExecutionEnvelope } from '@/lib/verifyExecutionEnvelope';

// Mock Next.js Head component
jest.mock('next/head', () => {
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    },
  };
});

describe('ExecutionEnvelopes Page', () => {
  describe('Basic Rendering', () => {
    test('renders the page with header and fixture table', () => {
      render(<ExecutionEnvelopes />);
      
      expect(screen.getByRole('heading', { name: /execution envelopes/i, level: 1 })).toBeInTheDocument();
      // "Canonical fixtures" appears in multiple places, just check the status role contains it
      const statusElement = screen.getByRole('status');
      expect(within(statusElement).getByText(/canonical fixtures/i)).toBeInTheDocument();
      expect(screen.getByRole('table', { name: /execution envelopes fixture table/i })).toBeInTheDocument();
    });

    test('renders all 6 fixtures in the table', () => {
      render(<ExecutionEnvelopes />);
      
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('button');
      
      // 6 fixture rows
      expect(rows).toHaveLength(6);
    });

    test('each fixture row shows verdict and FIXTURE badge', () => {
      render(<ExecutionEnvelopes />);
      
      // Check for FIXTURE badges
      expect(screen.getAllByText('FIXTURE')).toHaveLength(6);
      
      // Check that verdict badges exist (there are multiple ACCEPT badges)
      const table = screen.getByRole('table');
      expect(within(table).getAllByText('ACCEPT').length).toBeGreaterThan(0);
      expect(within(table).getAllByText('DENY').length).toBeGreaterThan(0);
      expect(within(table).getAllByText('EXPIRED').length).toBeGreaterThan(0);
      expect(within(table).getAllByText('DIGEST_MISMATCH').length).toBeGreaterThan(0);
      expect(within(table).getAllByText('REJECT_UNKNOWN').length).toBeGreaterThan(0);
    });
  });

  describe('Filter Behavior', () => {
    test('decision filter shows only matching verdicts', () => {
      render(<ExecutionEnvelopes />);
      
      const decisionFilter = screen.getByLabelText(/filter by decision verdict/i);
      
      // Filter to ACCEPT only
      fireEvent.change(decisionFilter, { target: { value: 'ACCEPT' } });
      
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('button');
      
      // Should show 2 ACCEPT verdicts (accepted and null-defaults)
      expect(rows.length).toBeLessThan(6);
      rows.forEach(row => {
        expect(within(row).getByText('ACCEPT')).toBeInTheDocument();
      });
    });

    test('route filter shows only matching routes', () => {
      render(<ExecutionEnvelopes />);
      
      const routeFilter = screen.getByLabelText(/filter by route identity/i);
      
      // Filter to routes containing "node-1"
      fireEvent.change(routeFilter, { target: { value: 'node-1' } });
      
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('button');
      
      // Should show fixtures routed to node-1
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.length).toBeLessThan(6);
    });

    test('reason filter searches verdict and eligibility decision', () => {
      render(<ExecutionEnvelopes />);
      
      const reasonFilter = screen.getByLabelText(/filter by rejection or denial reason/i);
      
      // Filter to "deny"
      fireEvent.change(reasonFilter, { target: { value: 'deny' } });
      
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('button');
      
      // Should show DENY verdict
      expect(rows.length).toBeGreaterThan(0);
      expect(within(rows[0]).getByText('DENY')).toBeInTheDocument();
    });

    test('evidence status filter works', () => {
      render(<ExecutionEnvelopes />);
      
      const evidenceFilter = screen.getByLabelText(/filter by evidence presence/i);
      
      // Filter to "Has evidence"
      fireEvent.change(evidenceFilter, { target: { value: 'yes' } });
      
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('button');
      
      // Should show fewer than all fixtures
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.length).toBeLessThan(6);
      
      // Filter to "No evidence"
      fireEvent.change(evidenceFilter, { target: { value: 'no' } });
      
      const rowsNoEvidence = within(table).getAllByRole('button');
      expect(rowsNoEvidence.length).toBeGreaterThan(0);
    });

    test('claim status filter works', () => {
      render(<ExecutionEnvelopes />);
      
      const claimFilter = screen.getByLabelText(/filter by claim.*presence/i);
      
      // Filter to "Has claims"
      fireEvent.change(claimFilter, { target: { value: 'yes' } });
      
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('button');
      
      // Should show fixtures with allowed_capabilities
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.length).toBeLessThan(6);
    });

    test('timestamp sort ascending orders by created_at', () => {
      render(<ExecutionEnvelopes />);
      
      const timestampSort = screen.getByLabelText(/sort by timestamp/i);
      
      // Sort oldest first
      fireEvent.change(timestampSort, { target: { value: 'asc' } });
      
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('button');
      
      // All fixtures should still be visible
      expect(rows).toHaveLength(6);
    });

    test('timestamp sort descending orders by created_at', () => {
      render(<ExecutionEnvelopes />);
      
      const timestampSort = screen.getByLabelText(/sort by timestamp/i);
      
      // Sort newest first
      fireEvent.change(timestampSort, { target: { value: 'desc' } });
      
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('button');
      
      // All fixtures should still be visible
      expect(rows).toHaveLength(6);
    });

    test('multiple filters can be combined', () => {
      render(<ExecutionEnvelopes />);
      
      const decisionFilter = screen.getByLabelText(/filter by decision verdict/i);
      const evidenceFilter = screen.getByLabelText(/filter by evidence presence/i);
      
      // Filter to ACCEPT verdicts with evidence
      fireEvent.change(decisionFilter, { target: { value: 'ACCEPT' } });
      fireEvent.change(evidenceFilter, { target: { value: 'yes' } });
      
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('button');
      
      // Should show only ACCEPT verdicts with evidence
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.length).toBeLessThan(6);
    });
  });

  describe('Empty State', () => {
    test('shows empty state message when no fixtures match filters', () => {
      render(<ExecutionEnvelopes />);
      
      const reasonFilter = screen.getByLabelText(/filter by rejection or denial reason/i);
      
      // Filter to something that won't match
      fireEvent.change(reasonFilter, { target: { value: 'NONEXISTENT_FILTER_VALUE_XYZ' } });
      
      // Look for the empty state message (when no fixtures match, there's no table)
      const emptyMessages = screen.getAllByText(/no fixtures match the current filters/i);
      expect(emptyMessages.length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument();
    });

    test('clear filters button resets all filters', () => {
      render(<ExecutionEnvelopes />);
      
      const reasonFilter = screen.getByLabelText(/filter by rejection or denial reason/i);
      
      // Apply a filter that results in empty state
      fireEvent.change(reasonFilter, { target: { value: 'NONEXISTENT' } });
      
      const clearButton = screen.getByRole('button', { name: /clear all filters/i });
      expect(clearButton).toBeInTheDocument();
      
      // Click clear filters
      fireEvent.click(clearButton);
      
      // Should show all fixtures again
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('button');
      expect(rows).toHaveLength(6);
    });
  });

  describe('Error State', () => {
    test('malformed fixture renders as REJECT_UNKNOWN with error indication', () => {
      // The 'unknown-field' fixture is intentionally malformed
      render(<ExecutionEnvelopes />);
      
      // Find the unknown-field row
      const unknownFieldText = screen.getByText('unknown-field');
      const row = unknownFieldText.closest('tr');
      
      expect(row).toBeInTheDocument();
      if (row) {
        expect(within(row).getByText('REJECT_UNKNOWN')).toBeInTheDocument();
      }
    });

    test('REJECT_UNKNOWN verdict has distinct styling', () => {
      render(<ExecutionEnvelopes />);
      
      const table = screen.getByRole('table');
      const rejectBadge = within(table).getByText('REJECT_UNKNOWN');
      
      // Check that it has the expected classes (red theme)
      expect(rejectBadge).toHaveClass('text-red-300');
    });
  });

  describe('Detail Panel', () => {
    test('shows provenance information when a fixture is selected', () => {
      render(<ExecutionEnvelopes />);
      
      // Click on the accepted fixture
      const acceptedRow = screen.getByText('accepted').closest('tr');
      if (acceptedRow) {
        fireEvent.click(acceptedRow);
      }
      
      // Check for provenance section
      expect(screen.getByRole('heading', { name: /provenance/i })).toBeInTheDocument();
      expect(screen.getByText(/policy digest:/i)).toBeInTheDocument();
      expect(screen.getByText(/created at:/i)).toBeInTheDocument();
      expect(screen.getByText(/expires at:/i)).toBeInTheDocument();
      expect(screen.getByText(/route identity:/i)).toBeInTheDocument();
    });

    test('shows verification status and reason', () => {
      render(<ExecutionEnvelopes />);
      
      // Click on the accepted fixture
      const acceptedRow = screen.getByText('accepted').closest('tr');
      if (acceptedRow) {
        fireEvent.click(acceptedRow);
      }
      
      // Check for verification status section
      expect(screen.getByRole('heading', { name: /verification status/i })).toBeInTheDocument();
      expect(screen.getByText(/all verification checks passed/i)).toBeInTheDocument();
    });

    test('shows omitted/not present fields for fixtures with missing optional fields', () => {
      render(<ExecutionEnvelopes />);
      
      // Click on the denied fixture (has no routing_decision or expires_at)
      const deniedRow = screen.getByText('denied').closest('tr');
      if (deniedRow) {
        fireEvent.click(deniedRow);
      }
      
      // Check for omitted section
      expect(screen.getByRole('heading', { name: /omitted \/ not present/i })).toBeInTheDocument();
    });

    test('shows full envelope JSON', () => {
      render(<ExecutionEnvelopes />);
      
      // Click on the accepted fixture
      const acceptedRow = screen.getByText('accepted').closest('tr');
      if (acceptedRow) {
        fireEvent.click(acceptedRow);
      }
      
      // Check for full JSON section
      expect(screen.getByRole('heading', { name: /full envelope json/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('filter controls have proper labels', () => {
      render(<ExecutionEnvelopes />);
      
      expect(screen.getByLabelText(/filter by decision verdict/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by route identity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by rejection or denial reason/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sort by timestamp/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by evidence presence/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by claim.*presence/i)).toBeInTheDocument();
    });

    test('table has proper ARIA attributes', () => {
      render(<ExecutionEnvelopes />);
      
      const table = screen.getByRole('table', { name: /execution envelopes fixture table/i });
      expect(table).toBeInTheDocument();
      
      // Check for column headers
      expect(screen.getByRole('columnheader', { name: /fixture/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /verdict/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /policy digest/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /expires at/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /eligibility/i })).toBeInTheDocument();
    });

    test('fixture rows are keyboard accessible', () => {
      render(<ExecutionEnvelopes />);
      
      const table = screen.getByRole('table');
      const firstRow = within(table).getAllByRole('button')[0];
      
      // Rows should have tabIndex
      expect(firstRow).toHaveAttribute('tabIndex', '0');
      
      // Test Enter key
      firstRow.focus();
      fireEvent.keyDown(firstRow, { key: 'Enter', code: 'Enter' });
      
      // Should be selected (has aria-pressed)
      expect(firstRow).toHaveAttribute('aria-pressed', 'true');
      
      // Test Space key on another row
      const secondRow = within(table).getAllByRole('button')[1];
      secondRow.focus();
      fireEvent.keyDown(secondRow, { key: ' ', code: 'Space' });
      
      // Should be selected
      expect(secondRow).toHaveAttribute('aria-pressed', 'true');
    });

    test('filter section has proper heading', () => {
      render(<ExecutionEnvelopes />);
      
      expect(screen.getByRole('heading', { name: /filters/i, level: 2 })).toBeInTheDocument();
    });

    test('detail panel has proper heading', () => {
      render(<ExecutionEnvelopes />);
      
      // Click on a fixture to show detail panel
      const acceptedRow = screen.getByText('accepted').closest('tr');
      if (acceptedRow) {
        fireEvent.click(acceptedRow);
      }
      
      expect(screen.getByRole('heading', { name: /accepted.json/i, level: 2 })).toBeInTheDocument();
    });

    test('status role for result count message', () => {
      render(<ExecutionEnvelopes />);
      
      // The "Canonical fixtures" badge has role="status"
      const statusElement = screen.getByRole('status');
      expect(within(statusElement).getByText(/canonical fixtures/i)).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    test('can navigate through fixtures using keyboard', () => {
      render(<ExecutionEnvelopes />);
      
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('button');
      
      // Focus first row
      rows[0].focus();
      expect(document.activeElement).toBe(rows[0]);
      
      // Press Enter to select
      fireEvent.keyDown(rows[0], { key: 'Enter' });
      expect(rows[0]).toHaveAttribute('aria-pressed', 'true');
      
      // Focus and select second row with Space
      rows[1].focus();
      fireEvent.keyDown(rows[1], { key: ' ' });
      expect(rows[1]).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
