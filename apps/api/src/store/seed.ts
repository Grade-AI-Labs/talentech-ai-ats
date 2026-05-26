import type { Repos } from './repo.js';

export function seed(repos: Repos): void {
  repos.jobs.create({
    title: 'Senior Backend Engineer',
    description:
      'Build and operate the services powering our ATS platform. You will work across Node.js, TypeScript, and PostgreSQL in a small, focused team.',
    requirements: ['TypeScript', 'Node.js', 'PostgreSQL', 'REST APIs'],
  });

  repos.jobs.create({
    title: 'Frontend Engineer',
    description:
      'Craft the candidate-facing experience for our ATS. You will own the React frontend, accessibility, and design-system collaboration.',
    requirements: ['React', 'TypeScript', 'CSS', 'Accessibility'],
  });
}
