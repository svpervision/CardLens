import { CenteringMeasurement } from './cardData';

export function analyzeCentering(
  frontRatio: [number, number],
  backRatio: [number, number]
): { centering: CenteringMeasurement; grade: number } {
  const centering: CenteringMeasurement = {
    leftRight: frontRatio,
    topBottom: backRatio,
  };

  const lrDiff = Math.abs(frontRatio[0] - frontRatio[1]);
  const tbDiff = Math.abs(backRatio[0] - backRatio[1]);
  const maxDiff = Math.max(lrDiff, tbDiff);

  let grade: number;
  if (maxDiff <= 10) grade = 10;
  else if (maxDiff <= 20) grade = 9;
  else if (maxDiff <= 30) grade = 8;
  else if (maxDiff <= 40) grade = 7;
  else grade = 6;

  return { centering, grade };
}

export function gradeCenteringFromPixels(
  imageWidth: number,
  imageHeight: number,
  cardBounds: { left: number; right: number; top: number; bottom: number }
): { frontRatio: [number, number]; topBottomRatio: [number, number]; grade: number } {
  const leftBorder = cardBounds.left;
  const rightBorder = imageWidth - cardBounds.right;
  const topBorder = cardBounds.top;
  const bottomBorder = imageHeight - cardBounds.bottom;

  const lrTotal = leftBorder + rightBorder;
  const tbTotal = topBorder + bottomBorder;

  const lrLeft = lrTotal > 0 ? Math.round((leftBorder / lrTotal) * 100) : 50;
  const lrRight = 100 - lrLeft;
  const tbTop = tbTotal > 0 ? Math.round((topBorder / tbTotal) * 100) : 50;
  const tbBottom = 100 - tbTop;

  const lrDiff = Math.abs(lrLeft - lrRight);
  const tbDiff = Math.abs(tbTop - tbBottom);
  const maxDiff = Math.max(lrDiff, tbDiff);

  let grade: number;
  if (maxDiff <= 10) grade = 10;
  else if (maxDiff <= 20) grade = 9;
  else if (maxDiff <= 30) grade = 8;
  else if (maxDiff <= 40) grade = 7;
  else grade = 6;

  return {
    frontRatio: [lrLeft, lrRight],
    topBottomRatio: [tbTop, tbBottom],
    grade,
  };
}
