import { RenderOptions, queries } from '@testing-library/react';
import * as React from "react";
declare const customRender: (ui: React.ReactElement, options?: RenderOptions<typeof queries>) => import('@testing-library/react').RenderResult<typeof queries, HTMLElement, HTMLElement>;
export { customRender as render };
