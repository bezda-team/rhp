import { default as React } from 'react';
import { Observable } from '@legendapp/state';
export type BarContextType = {
    index: Observable<number>;
    order: Observable<number>;
    data: Observable<number[]>;
    width: Observable<string>;
    decorationWidth: Observable<string>;
};
declare const BarContext: React.Context<BarContextType>;
export default BarContext;
