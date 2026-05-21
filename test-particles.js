import html2canvas from 'html2canvas';
export async function test() {
  const container = document.querySelector('.landing-content');
  container.style.transform = 'none';
  const canvas = await html2canvas(container, { backgroundColor: null });
  container.style.transform = '';
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let count = 0;
  for(let i=3; i<data.length; i+=4) if(data[i]>40) count++;
  console.log("Particles found:", count);
  return count;
}
