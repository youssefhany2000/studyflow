import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StageFlow, type StageDef } from './StageFlow';

const STAGES: StageDef[] = [
  { name: 'first', label: 'First stage', prompt: 'Do the first thing.' },
  { name: 'second', label: 'Second stage', prompt: 'Do the second thing.', hasRating: true },
];

describe('StageFlow', () => {
  it('shows the first stage on mount', () => {
    render(<StageFlow stages={STAGES} onComplete={vi.fn()} />);
    expect(screen.getByText('First stage')).toBeInTheDocument();
    expect(screen.getByText('Do the first thing.')).toBeInTheDocument();
  });

  it('advances on Next and shows Finish on the last stage', () => {
    render(<StageFlow stages={STAGES} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Second stage')).toBeInTheDocument();
    expect(screen.getByText('Finish')).toBeInTheDocument();
  });

  it('calls onComplete once, with one result per stage in order', () => {
    const onComplete = vi.fn();
    render(<StageFlow stages={STAGES} onComplete={onComplete} />);

    fireEvent.change(screen.getByPlaceholderText('Type here...'), { target: { value: 'my first answer' } });
    fireEvent.click(screen.getByText('Next'));

    fireEvent.change(screen.getByPlaceholderText('Type here...'), { target: { value: 'my second answer' } });
    fireEvent.click(screen.getByText('Finish'));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith([
      { stage_name: 'first', content: 'my first answer', rating: null },
      { stage_name: 'second', content: 'my second answer', rating: null },
    ]);
  });
});
