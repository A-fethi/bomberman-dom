import { Vnode } from "../node_modules/all4one-js/index.js";

export function Player({ player, map }) {
  if (!player) return null;
  const { id, x, y, direction = 'right' } = player;
  const mapWidth = map[0]?.length || 0;
//   const mapHeight = map.length;
  const cellSize = 100 / mapWidth;
  const scaleX = direction === 'left' ? -1 : 1;

  const getPlayerColor = (playerId) => {
    const colors = ['#ff4444', '#4444ff', '#44ff44', '#ffff44'];
    return colors[playerId - 1] || '#ffffff';
  };

  return Vnode("div", {
    class: "Player",
    style: `position: absolute; width: ${cellSize}%; height: ${cellSize}%; left: ${x * cellSize}%; top: ${y * cellSize}%; pointer-events: none; z-index: 2; transform: scaleX(${scaleX}); background-color: ${getPlayerColor(id)}; border: 2px solid #000; border-radius: 50%;`
  });
}