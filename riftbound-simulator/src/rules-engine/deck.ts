
import { CardDefinition, GameState, PlayerId } from './types';

// Moves up to `count` cards from the top of a player's deck into their hand.
// Rule 516.2.b: "The Turn Player draws 1."
export function draw(state: GameState, playerId: PlayerId, count = 1): CardDefinition[]{
    const player = state.players[playerId];
    const drawn = player.deck.splice(0, count);
    player.hand.push(...drawn);
    return drawn;
}