import { render } from '@testing-library/react';
import { createElement } from 'react';
import { expect, it, vi } from 'vitest';

// A Demo Mode site's demo data page keeps the plugin's cards but none of
// the data card's actions: any visitor may enter as its administrator, and
// Generate, Clear or Reset would wipe the demo for everyone.

const given = vi.hoisted(() => ({
  components: undefined as Record<string, unknown> | undefined,
}));
vi.mock('@nocobase/app-plugin-demo-mode/client/settings', () => ({
  DemoModeSettings: (props: { components?: Record<string, unknown> }) => {
    given.components = props.components;
    return null;
  },
}));
vi.mock('../../client/components/crm/api.js', () => ({
  toText: (value: unknown) => String(value ?? ''),
  useCrmText: () => ({ text: (key: string) => key }),
}));

const { default: DemoEnvironmentPage } =
  await import('../../client/pages/settings/demo-environment.js');

it('drops the data card actions and the header, keeping the cards', () => {
  render(<DemoEnvironmentPage />);
  const components = given.components ?? {};
  const action = components.CardAction as Parameters<typeof createElement>[0];
  const { container } = render(
    createElement(action, null, createElement('button', null, 'Reset')),
  );
  expect(container).toBeEmptyDOMElement();
  expect(components.Header).toBeTypeOf('function');
  expect(components.Card).toBeUndefined();
});
