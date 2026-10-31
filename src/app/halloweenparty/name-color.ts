// A stable, name-seeded color: shared across devices without storing extra identity data.
const colors=['#f0ad79','#88c9ff','#c6a0ff','#82d6ac','#f1ca72','#f59fc2','#79d6dc','#b8d77a','#d6b7ff','#ffa89c','#9db8ff','#dfc69b'];
export function nameColor(name:string){
 let hash=2166136261;
 for(const character of name.trim().normalize('NFKC').toLowerCase()){
  hash=Math.imul(hash^character.codePointAt(0)!,16777619);
 }
 return colors[(hash>>>0)%colors.length];
}
