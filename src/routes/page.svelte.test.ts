import { describe, test, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	test('dashboard と output へのリンクを表示する', () => {
		render(Page);
		expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
		expect(screen.getByRole('link', { name: 'Output' })).toHaveAttribute('href', '/output');
	});
});
