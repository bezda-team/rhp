import type { FullBarElementType } from './FullBarElementType';
import { Observable } from '@legendapp/state';

type DataObservable = Observable<
{
    index: number, 
    data: number[], 
    order: number, 
    width: string, 
    decorationWidth: string,
    elements: FullBarElementType[], 
    id: string, 
    CSS: string
}[]>

export type { DataObservable };