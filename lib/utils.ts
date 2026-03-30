export type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | { [key: string]: boolean | undefined | null }
  | ClassValue[]

function toVal(mix: ClassValue): string {
  let str = ""

  if (typeof mix === "string" || typeof mix === "number") {
    str += mix
  } else if (typeof mix === "object") {
    if (Array.isArray(mix)) {
      for (let k = 0; k < mix.length; k++) {
        if (mix[k]) {
          const y = toVal(mix[k])
          if (y) {
            str && (str += " ")
            str += y
          }
        }
      }
    } else {
      for (const k in mix) {
        if (mix[k]) {
          str && (str += " ")
          str += k
        }
      }
    }
  }

  return str
}

export function cn(...inputs: ClassValue[]) {
  let str = ""
  for (let i = 0; i < inputs.length; i++) {
    const tmp = toVal(inputs[i])
    if (tmp) {
      str && (str += " ")
      str += tmp
    }
  }
  return str
}

export type VariantProps<T extends (...args: any) => any> = Omit<Parameters<T>[0], "class" | "className">

export function cva<T extends Record<string, Record<string, string>>>(
  base: string,
  config?: {
    variants?: T
    defaultVariants?: { [K in keyof T]?: keyof T[K] }
  },
) {
  return (props?: { [K in keyof T]?: keyof T[K] } & { class?: string; className?: string }) => {
    if (!config) return cn(base, props?.class, props?.className)

    const { variants, defaultVariants } = config
    let classes = base

    if (variants) {
      for (const key in variants) {
        const variantKey = props?.[key as keyof typeof props] ?? defaultVariants?.[key]
        if (variantKey && variants[key]) {
          const variantClass = variants[key][variantKey as string]
          if (variantClass) {
            classes += " " + variantClass
          }
        }
      }
    }

    return cn(classes, props?.class, props?.className)
  }
}
