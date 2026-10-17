export const colors = {
  background: '#090A0C',
  surface: '#121417',
  surfaceElevated: '#191C21',
  border: '#292D34',
  red: '#E5091B',
  redBright: '#FF2438',
  white: '#F8F8F8',
  muted: '#8D929B',
  dim: '#555B65',
  success: '#B8F36B',
};

// 0 = invisible; 100 = blanco totalmente opaco.
export const playerTextOpacityPercent = 100;
export const playerSecondaryTextColor = `rgba(255, 255, 255, ${Math.min(100, Math.max(0, playerTextOpacityPercent)) / 100})`;

// Fondo de los círculos: blanco #FFFFFF, negro #000000, rojo #FF0000, azul #0000FF.
export const playerIconBackgroundHex = '#FF0000';
// 0 = transparente; 100 = opaco.
export const playerIconBackgroundOpacityPercent = 10;
export const playerIconBackgroundColor = playerColorWithOpacity(playerIconBackgroundHex, playerIconBackgroundOpacityPercent);

// Opacidad de los iconos y de sus bordes circulares, de 0 a 100.
export const playerIconOpacityPercent = 100;
export const playerIconBorderOpacityPercent = 100;

export function playerColorWithOpacity(hex: string, percent: number): string {
  const value = hex.replace('#', '');
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(100, Math.max(0, percent)) / 100})`;
}

// Inclinación de las rayas dentro de los círculos, en grados.
export const playerIconStripeRotationDegrees = 45;
export const playerIconStripeOpacityPercent = 25;

// Intensidad del fondo metálico y sus franjas: 0 = oculto; 100 = máximo.
export const podiumGoldColorPercent = 100;
export const podiumSilverColorPercent = 100;
export const podiumBronzeColorPercent = 100;

// Opacidad de la sombra negra exterior de las cartas: 0 = oculta; 100 = máximo.
export const podiumShadowOpacityPercent = 100;

// Mezcla de las fotos del top 3 con la carta (porcentajes de 0 a 100).
export const podiumPhotoBlendHeightPercent = 5; // Altura desde la base de la foto.
export const podiumPhotoBlendOpacityPercent = 100; // Intensidad del efecto.
