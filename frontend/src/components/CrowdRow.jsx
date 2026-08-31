const SCALES = [0.95, 1.02, 0.98, 1.05, 0.97, 1, 1.03, 0.96];

export default function CrowdRow({ figures }) {
  return (
    <div className="flex items-end justify-center gap-2 overflow-hidden px-4 sm:gap-4">
      {figures.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className="w-[64px] shrink-0 object-contain sm:w-[88px]"
          style={{ transform: `scale(${SCALES[i % SCALES.length]})`, transformOrigin: "bottom" }}
        />
      ))}
    </div>
  );
}
