import Image from "next/image";

type Props = {
  className?: string;
  size?: number;
};

export function BrandMark({ className = "", size = 36 }: Props) {
  return (
    <Image
      src="/brand/flamingo-mark.svg"
      alt="Flamingo"
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
      priority
    />
  );
}
