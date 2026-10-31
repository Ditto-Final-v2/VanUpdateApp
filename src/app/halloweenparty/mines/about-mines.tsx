import Image from 'next/image';

const photos=[9,8,11,13,14,25,26,28,29,2,4,5,6,7,10,12,15,16,17,18,19,20,21,22,23,24,27,1,3];
export default function AboutMines(){
 return <section className="hp-panel hp-info hp-about" aria-labelledby="about-mines-title">
  <p className="hp-eyebrow">A HALLOWEEN TRANSMISSION FROM NEVADA</p>
  <h2 id="about-mines-title">About the mines</h2>
  <p className="hp-description">Poinsettia is a remote Nevada mining ghost town, with abandoned buildings scattered across the desert. I’m here at the abandoned Poinsettia mercury mine, two hours from the nearest paved road. I came out to party with ghosts on Halloween, but the spirits trapped me: heavy rain is in the forecast, leaving me stuck for the foreseeable future.</p>
  <p className="hp-description hp-about-invite">Join the party from the Abode or wherever you’re haunting tonight. Complete quests, collect Mercury Tonic, and help us reach 10,000.</p>
  <div className="hp-mine-gallery">{photos.map((id,index)=>{
   const src=`/images/mines/nevada-${String(id).padStart(2,'0')}.webp`;
   return <a key={id} href={src} target="_blank" rel="noreferrer" aria-label={`Open Nevada photo ${index+1}`}><Image src={src} alt={`Curtis’s Nevada trip, photo ${index+1}`} width={700} height={500} loading="lazy" unoptimized/></a>;
  })}</div>
 </section>;
}
