import Overlay from './overlay';

export default async function Page({searchParams}:{searchParams:Promise<{view?:string}>}) {
 const {view}=await searchParams;
 return <Overlay view={view==='counter'?'counter':'chat'}/>;
}
