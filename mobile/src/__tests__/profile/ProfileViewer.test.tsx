import React from 'react';
import { render } from '@testing-library/react-native';
import { ProfileViewer } from '@/components/profile';
import { WorkerProfile } from '@/types';

const mockWorkerProfile: WorkerProfile = {
  userId: 1,
  bio: 'Experienced plumber with 10 years of experience',
  skills: ['Residential Plumbing', 'Commercial Plumbing'],
  serviceCategories: ['Plumbing'],
  hourlyRate: 50,
  location: 'New York, NY',
  portfolioImages: [],
  kycStatus: 'approved',
  rating: 4.5,
  totalJobs: 25,
};

describe('ProfileViewer', () => {
  it('renders worker profile correctly', () => {
    const { getByText } = render(
      <ProfileViewer
        profile={mockWorkerProfile}
        userType="worker"
        isOwnProfile={true}
      />
    );

    expect(getByText('Worker Profile')).toBeTruthy();
    expect(getByText('About')).toBeTruthy();
    expect(getByText('Experienced plumber with 10 years of experience')).toBeTruthy();
    expect(getByText('Skills')).toBeTruthy();
    expect(getByText('Residential Plumbing')).toBeTruthy();
    expect(getByText('$50')).toBeTruthy();
  });

  it('shows verification status correctly', () => {
    const { getByText } = render(
      <ProfileViewer
        profile={mockWorkerProfile}
        userType="worker"
        isOwnProfile={true}
      />
    );

    expect(getByText('Verification Status')).toBeTruthy();
    expect(getByText('Verified')).toBeTruthy();
  });
});