import Card from "@/components/Cards";
import { CARD_IMAGES } from "@/components/cardImages";
import styles from "./gallery.module.css"

export default function GalleryPage() {
  return (
    <div className={styles.grid}>
      {Object.keys(CARD_IMAGES).map((cardId) => (
        <Card key={cardId} cardId={cardId} />
      ))}
    </div>
  );
}