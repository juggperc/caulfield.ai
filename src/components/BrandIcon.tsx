import type { SimpleIcon } from "simple-icons";

export type CustomBrandIcon = {
  readonly title: string;
  readonly hex: string;
  readonly path: string;
};

export type BrandIconSource = SimpleIcon | CustomBrandIcon;

const isSimpleIcon = (icon: BrandIconSource): icon is SimpleIcon =>
  "slug" in icon && typeof (icon as SimpleIcon).slug === "string";

type BrandIconProps = {
  readonly icon: BrandIconSource;
  readonly className?: string;
  readonly size?: number;
};

/** Renders a brand mark from simple-icons or a custom path (single-color). */
export const BrandIcon = ({
  icon,
  className,
  size = 20,
}: BrandIconProps) => {
  const label = icon.title;
  const fill = `#${icon.hex}`;

  if (isSimpleIcon(icon)) {
    return (
      <svg
        role="img"
        aria-label={label}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
      >
        <title>{label}</title>
        <path fill={fill} d={icon.path} />
      </svg>
    );
  }

  return (
    <svg
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
    >
      <title>{label}</title>
      <path fill={fill} d={icon.path} />
    </svg>
  );
};
