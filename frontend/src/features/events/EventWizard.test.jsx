import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventWizard } from './EventWizard';

describe('<EventWizard />', () => {
  it('blocks progress until step 1 is valid, then advances', async () => {
    const user = userEvent.setup();
    render(<EventWizard submitLabel="Create" onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByText(/give your event a title/i)).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 6/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/event title/i), 'Robotics Expo');
    await user.type(screen.getByLabelText(/description/i), 'A showcase of student robots.');
    await user.click(screen.getByRole('radio', { name: /hackathon/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText(/step 2 of 6/i)).toBeInTheDocument();
  });

  it('submits the full event from the review step', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <EventWizard
        submitLabel="Create"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        initial={{ title: 'Workshop 101', description: 'Hands-on intro workshop.', venue: 'Lab 3', city: 'Chennai', category: 'workshop' }}
      />,
    );
    for (let i = 0; i < 5; i++) await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(await screen.findByRole('button', { name: /^create$/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ title: 'Workshop 101', category: 'workshop', city: 'Chennai' });
  });
});
