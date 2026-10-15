// Small color chip used by the generated token pages. The hex value is always written next to it as text.
// Values with alpha (8-digit hex) sit on a checkerboard so transparency is visible.
export default function Swatch({ c }) {
  const alpha = c.length > 7;
  return (
    <span
      style={{
        display: "inline-block", width: 14, height: 14, borderRadius: 3, verticalAlign: "middle", marginRight: 2,
        border: "1px solid rgba(128,128,128,.45)",
        background: alpha ? `linear-gradient(${c}, ${c}), conic-gradient(#ccc 25%, #fff 0 50%, #ccc 0 75%, #fff 0) 0 0 / 8px 8px` : c,
      }}
    />
  );
}
