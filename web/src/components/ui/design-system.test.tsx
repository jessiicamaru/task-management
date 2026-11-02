import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button, Checkbox, Input, PriorityBadge, Spinner, StatusBadge } from './index';

describe('Design System Primitives', () => {
  it('renders Button with variants and loading state preserving button semantics', () => {
    const { rerender } = render(<Button variant="primary">Submit</Button>);
    const button = screen.getByRole('button', { name: /submit/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();

    rerender(
      <Button variant="primary" loading>
        Submit
      </Button>,
    );
    expect(button).toBeDisabled();
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });

  it('renders Input with accessible error message and aria-invalid', () => {
    render(<Input label="Email Address" error="Email is required" name="email" />);
    const input = screen.getByRole('textbox', { name: /email address/i });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
  });

  it('renders Checkbox with interactive toggle and label', () => {
    render(<Checkbox label="I agree" />);
    const checkbox = screen.getByRole('checkbox', { name: /i agree/i });
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('renders StatusBadge and PriorityBadge with both icon and text label (a11y)', () => {
    render(
      <>
        <StatusBadge status="in_progress" />
        <PriorityBadge priority="urgent" />
      </>,
    );

    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });

  it('renders Spinner with accessible status role', () => {
    render(<Spinner size="md" />);
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });
});
