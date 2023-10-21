import type { FullBarElementType } from './FullBarElementType';
import { Observable } from '@legendapp/state';

type ConfigObservable = Observable<
{
    dataIndex: number,  
    varIndex: number,
    order: number, 
    width: string, 
    decorationWidth: string,
    elements: FullBarElementType[], 
    id: string, 
    CSS: string
}[]>

export type { ConfigObservable };