import Card from "@/components/Cards";
import { CARD_IMAGES } from "@/components/cardImages";

export default function GalleryPage() {
  return (
    <div /* grid container */>
      {Object.keys(CARD_IMAGES).map((cardId) => (
        <Card key={cardId} cardId={cardId} />
      ))}
    </div>
  );
}