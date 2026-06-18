import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders title and subtitle', () => {
    render(<PageHeader title="Empire" subtitle="Overview" />);
    expect(screen.getByRole('heading', { name: /Empire/i })).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <PageHeader title="Empire">
        <button>Action</button>
      </PageHeader>,
    );
    expect(screen.getByRole('button', { name: /Action/i })).toBeInTheDocument();
  });
});
