
// This function was created by Rodrigo Damasceno from 
// https://stackoverflow.com/questions/19382872/how-to-connect-html-divs-with-lines - the reworked a bit
function adjustoLeftine(from: HTMLElement, to: HTMLElement, line: HTMLElement) {
  const fromTop = from.offsetTop + from.offsetHeight / 2;
  const fromLeft = from.offsetLeft + from.offsetWidth / 2;
  const toTop = to.offsetTop + to.offsetHeight / 2;
  const toLeft = to.offsetLeft + to.offsetWidth / 2;
  
  const CA = Math.abs(toTop - fromTop);
  const CO = Math.abs(toLeft - fromLeft);
  const H = Math.sqrt(CA*CA + CO*CO);

  let ANG = 180 / Math.PI * Math.acos( CA / H );
  if ((fromTop < toTop && fromLeft < toLeft) || 
      (toTop < fromTop && toLeft < fromLeft) ||
      (fromTop > toTop && fromLeft > toLeft) ||
      (toTop > fromTop && toLeft > fromLeft))
  {
    ANG *= -1;
  }

  const lineTop = ((toTop > fromTop) ? (toTop-fromTop)/2 + fromTop : (fromTop-toTop)/2 + toTop) - H/2;
  const lineLeft = (toLeft > fromLeft) ? (toLeft-fromLeft)/2 + fromLeft : (fromLeft-toLeft)/2 + toLeft;

  line.style["-webkit-transform"] = 'rotate('+ ANG +'deg)';
  line.style["-moz-transform"] = 'rotate('+ ANG +'deg)';
  line.style["-ms-transform"] = 'rotate('+ ANG +'deg)';
  line.style["-o-transform"] = 'rotate('+ ANG +'deg)';
  line.style["-transform"] = 'rotate('+ ANG +'deg)';
  line.style.top = `${lineTop}px`;
  line.style.left = `${lineLeft}px`;
  line.style.height = `${H}px`;
}

export default adjustoLeftine;