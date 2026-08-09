import React from "react";
import { CARD_IMAGES } from "./cardImages";
import Image from "next/image";
import styles from "./Cards.module.css"

type CardProps = {
    cardId: string
}

export default function Card({ cardId }: CardProps) {
const imagePath = CARD_IMAGES[cardId];
if (!imagePath) {
  return null
}

const isBattlefield = imagePath.type === "Battlefield";

if (isBattlefield) {
  return (
    <div className={styles.battlefieldWrapper}>
      <Image className={styles.isBattlefield} src={imagePath.src} width={imagePath.width} height={imagePath.height} alt={imagePath.alt} />
    </div>
  );
}

return (
  <Image className={styles.cardImageSize} src={imagePath.src} width={imagePath.width} height={imagePath.height} alt={imagePath.alt} />
);
}