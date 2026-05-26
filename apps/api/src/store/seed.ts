import type { Repos } from './repo.js';

export function seed(repos: Repos): void {
  const backendJob = repos.jobs.create({
    title: 'Senior Backend Engineer',
    description:
      'Build and operate the services powering our ATS platform. You will work across Node.js, TypeScript, and PostgreSQL in a small, focused team.',
    requirements: ['TypeScript', 'Node.js', 'PostgreSQL', 'REST APIs'],
  });

  const frontendJob = repos.jobs.create({
    title: 'Frontend Engineer',
    description:
      'Craft the candidate-facing experience for our ATS. You will own the React frontend, accessibility, and design-system collaboration.',
    requirements: ['React', 'TypeScript', 'CSS', 'Accessibility'],
  });

  const maya = repos.candidates.create({
    name: 'Maya Patel',
    email: 'maya.patel@example.com',
    summary:
      'Backend engineer with seven years of experience shipping Node.js services and managing PostgreSQL at scale.',
    skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'AWS'],
  });

  const jonas = repos.candidates.create({
    name: 'Jonas Lindberg',
    email: 'jonas.lindberg@example.com',
    summary:
      'Product-focused frontend engineer who has led React rewrites and cares deeply about accessibility.',
    skills: ['React', 'TypeScript', 'CSS', 'Accessibility'],
  });

  repos.candidates.create({
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    summary:
      'Full-stack engineer comfortable across the stack, currently focused on developer platforms and tooling.',
    skills: ['TypeScript', 'Node.js', 'React', 'Docker'],
  });

  repos.applications.create({
    jobId: backendJob.id,
    candidateId: maya.id,
  });

  repos.applications.create({
    jobId: frontendJob.id,
    candidateId: jonas.id,
  });
}
