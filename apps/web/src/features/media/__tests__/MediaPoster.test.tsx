import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/__tests__/helpers';

import { MediaPoster } from '../components/MediaPoster';

import { screen } from '@testing-library/react';

describe('MediaPoster', () => {
  it('el póster ampliable se anuncia como "Ampliar póster de {título}"', () => {
    renderWithProviders(<MediaPoster posterPath="/a.jpg" variant="cover" title="Dune" zoomable />);

    expect(screen.getByRole('button', { name: 'Ampliar póster de Dune' })).toBeInTheDocument();
  });
});
