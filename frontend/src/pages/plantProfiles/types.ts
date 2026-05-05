export type GalleryImage = { id: string; url: string };

export type ImageGalleryState = {
  profileName: string;
  images: GalleryImage[];
  startIndex: number;
};
