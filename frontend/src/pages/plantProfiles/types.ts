export type GalleryImage = { id: string; url: string; thumbUrl?: string };

export type ImageGalleryState = {
  profileName: string;
  images: GalleryImage[];
  startIndex: number;
};
