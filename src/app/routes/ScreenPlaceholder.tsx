interface ScreenPlaceholderProps {
  name: string
}

export function ScreenPlaceholder({ name }: ScreenPlaceholderProps) {
  return <h1 className="text-text-dim">{name}</h1>
}
