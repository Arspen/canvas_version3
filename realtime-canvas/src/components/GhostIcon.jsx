import './ghostIcon.css';

/*  Just the ghost in the top-left corner – no logic */
export default function GhostIcon() {
  return (
    <img
      src="/icons/Shadow.png"
      alt=""
      className="ghost-fixed"
      draggable={false}
    />
  );
}
