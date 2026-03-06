export interface HateoasLink {
  href: string;
  method?: string;
}

export type HateoasLinks = {
  self: HateoasLink;
} & Record<string, HateoasLink | null | undefined>;
