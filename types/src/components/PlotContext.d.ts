import { default as React } from 'react';
import { Vars } from './types/Vars';
import { Observable } from '@legendapp/state';
export type PlotContextType = {
    theme: Observable<object>;
    plotData: Observable<Array<number[]>>;
    dataMax: Observable<number>;
    vars: Observable<Vars>;
    orientation: Observable<number>;
};
declare const PlotContext: React.Context<PlotContextType>;
export default PlotContext;
