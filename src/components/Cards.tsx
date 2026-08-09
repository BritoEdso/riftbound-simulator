import React from "react";
import { CARD_IMAGES } from "./cardImages";
import Image from "next/image";

type CardProps = {
    cardId: string
}

export default function Card({ cardId }: CardProps) {
const imagePath = CARD_IMAGES[cardId];
if (!imagePath) {
  return null
}
return (
  <Image src={imagePath.src} width={imagePath.width} height={imagePath.height} alt={imagePath.alt} />
);
}