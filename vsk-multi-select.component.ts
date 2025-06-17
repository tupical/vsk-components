import { define, html, dispatch } from "https://cdn.investprojects.info/hybrids@9.0.0"

interface Option {
    value: string
    label: string
    children?: Option[]
}

export interface VskMultiSelectComponent extends HTMLElement {
    options: Option[]
    flatOptions: Option[]
    selected: string[]
    hasChanges: boolean
    isOpen: boolean
    changeOnClose: boolean
    placeholderText: string
    emptyText: string
    changeBtn: boolean
    selectAllBtn: boolean
}

declare global {
    interface HTMLElementTagNameMap {
        "vp-multi-select": VskMultiSelectComponent
    }
}

function toggleOption(host: VskMultiSelectComponent, event: Event) {
    const input = event.target as HTMLInputElement
    const value = input.value
    let newSelected = [...host.selected]

    const findOption = (options: Option[]): Option | undefined => {
        for (const opt of options) {
            if (opt.value === value) return opt
            if (opt.children) {
                const found = findOption(opt.children)
                if (found) return found
            }
        }
        return undefined
    }

    const option = findOption(host.options)
    const childValues = option?.children?.map((child) => child.value) || []

    if (input.checked) {
        newSelected = [...new Set([...newSelected, value, ...childValues])]
    } else {
        newSelected = newSelected.filter((v) => v !== value && !childValues.includes(v))
    }

    const updateParents = (options: Option[]) => {
        for (const opt of options) {
            if (opt.children) {
                const allChildrenSelected = opt.children.every((child) => newSelected.includes(child.value))
                const someChildrenSelected = opt.children.some((child) => newSelected.includes(child.value))

                if (allChildrenSelected) {
                    newSelected = [...new Set([...newSelected, opt.value])]
                } else if (!someChildrenSelected) {
                    newSelected = newSelected.filter((v) => v !== opt.value)
                }
                updateParents(opt.children)
            }
        }
    }

    updateParents(host.options)
    host.selected = newSelected
}

function handleClickOutside(host: VskMultiSelectComponent, event: MouseEvent) {
    if (!host.isOpen) return

    const target = event.target as Node

    if (target !== host || !host.contains(target)) {
        host.isOpen = false
    }
}

function toggleDropdown(host: VskMultiSelectComponent) {
    host.isOpen = !host.isOpen
}

function getDisplayText(options: Option[], selected: string[]) {
    const selectWidth = 200
    const charWidth = 8
    const maxChars = Math.floor(selectWidth / charWidth)

    const joined = options
        .flatMap((item) => item.children || [item])
        .filter((opt) => selected.includes(opt.value))
        .map((opt) => opt.label)
        .join(", ")
    if (joined.length <= maxChars) return joined
    return `${selected.length} из ${countAllOptions(options)} выбрано`
}

function countAllOptions(options: Option[]): number {
    return options.reduce((count, opt) => count + 1 + (opt.children ? countAllOptions(opt.children) : 0), 0)
}

function getCheckboxState(option: Option, selected: string[]): [boolean, boolean] {
    if (!option.children) return [selected.includes(option.value), false]

    const allChildrenSelected = option.children.every((child) => selected.includes(child.value))
    const someChildrenSelected = option.children.some((child) => selected.includes(child.value))

    return [allChildrenSelected, someChildrenSelected && !allChildrenSelected]
}

function selectAll(host: VskMultiSelectComponent) {
    if (host.selected.length === host.flatOptions.length) {
        host.selected = []
        return
    }

    host.selected = host.flatOptions.map((opt) => opt.value)
}

function change(host: VskMultiSelectComponent) {
    if (host.hasChanges) {
        dispatch(host, "change", { detail: host.selected })
        host.hasChanges = false
    }
}

export default define<VskMultiSelectComponent>({
    tag: "vp-multi-select",
    changeOnClose: true,
    placeholderText: "Не выбрано",
    emptyText: "Не выбрано",
    changeBtn: true,
    selectAllBtn: true,
    options: {
        value: [],
    },
    flatOptions: {
        value: [],
        connect(host: VskMultiSelectComponent, _, invalidate) {
            host.flatOptions = host.options.flatMap((item) => item.children || [item])
            invalidate()
        },
    },
    selected: {
        value: [],
        connect(host: VskMultiSelectComponent, _, invalidate) {
            if (typeof host.selected === "string") {
                host.selected = (host.selected as string).split(",")
                invalidate()
            }
            // console.log("Selected changed:", value)
        },
        observe(host: VskMultiSelectComponent, value: string[], lastValue: string[]) {
            host.hasChanges = true

            if (!host.changeOnClose) {
                change(host)
            }
        },
    },
    hasChanges: {
        value: false,
    },
    isOpen: {
        value: false,
        connect(host) {
            const handler = (event: MouseEvent) => handleClickOutside(host, event)
            document.addEventListener("click", handler)
            return () => document.removeEventListener("click", handler)
        },
        observe(host: VskMultiSelectComponent, value: boolean) {
            if (host.changeOnClose && !value) {
                change(host)
            }
        },
    },
    render: ({ options, selected, isOpen, changeBtn, selectAllBtn, placeholderText }) => html`
        <div class="container">
            <div class="select" onclick="${toggleDropdown}">${!selected.length ? placeholderText : getDisplayText(options, selected)}</div>
            ${isOpen &&
            html`
                <div class="dropdown">
                    ${options.map(
                        (option) => html`
                            <div class="option">
                                <label>
                                    <input
                                        type="checkbox"
                                        value=${option.value}
                                        checked=${getCheckboxState(option, selected)[0]}
                                        indeterminate=${getCheckboxState(option, selected)[1]}
                                        onchange=${toggleOption}
                                    />
                                    ${option.label}
                                </label>
                                ${option.children &&
                                html`
                                    <div class="children">
                                        ${option.children.map(
                                            (child) => html`
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        value=${child.value}
                                                        checked=${selected.includes(child.value)}
                                                        onchange=${toggleOption}
                                                    />
                                                    ${child.label}
                                                </label>
                                            `,
                                        )}
                                    </div>
                                `}
                            </div>
                        `,
                    )}
                    ${(changeBtn || selectAllBtn) &&
                    html`
                        <div class="button-container">
                            ${selectAllBtn && html` <a href="javascript:;" onclick="${selectAll}">Выбрать все</a> `}
                            ${changeBtn && html` <a class="primary" href="javascript:;" onclick="${toggleDropdown}">Ок</a> `}
                        </div>
                    `}
                </div>
            `}
        </div>
    `.css`
    :host {
        font-family: "Fira Sans", Tahoma, sans-serif;
        font-size: 12px;
    }
    .container {
        position: relative;
        width: 200px;
    }
    .select {
        border-radius: 4px;
        border: 1px solid #ced4da;
        letter-spacing: .4px;
        color: #000;
        padding: 4px 20px 4px 5px;
        padding-inline-end: 20px;
        cursor: pointer;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }
    .select:after {
        content: ' ';
        height: 0;
        position: absolute;
        top: 50%;
        right: 5px;
        width: 0;
        border: 6px solid rgba(0, 0, 0, 0);
        border-top-color: #999;
        margin-top: -3px;
    }
    .dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        border: 1px solid #ccc;
        background: white;
        z-index: 1;
        max-height: 400px;
        overflow-y: auto;
        scrollbar-color: #CCCCCC #ffffff;
        scrollbar-gutter: stable;
        scrollbar-width: thin;
    }
    .button-container {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        justify-content: space-around;
        padding: 0.5rem;
        position: sticky;
        bottom: 0;
        background: #fff;
        width: calc(100% - 1rem);
    }
    .button-container a {
        font-weight: 400;
        font-size: 1em;
        text-align: center;
        text-transform: lowercase;
        text-decoration: none;
        white-space: nowrap;
        vertical-align: middle;
        user-select: none;
        border: 1px solid #498cda;
        border-radius: 0.2rem;
        overflow-x: hidden;
        padding: 0.25rem 0.5rem;
        line-height: 1.25;
        color: #498cda;
        flex: auto;
    }
    .button-container a:hover {
        background-color: #498cda;
        color: #fff;
    }
    .button-container a.primary {
        background-color: #498cda;
        color: #fff;
    }
    .button-container a.primary:hover {
        color: #fff;
        background-color: #2b78d2;
        border-color: #2972c7;
    }
    .children {
      padding-left: 15px;
    }
    label {
        display: block;
        padding: 4px;
        cursor: pointer;
        padding-inline-start: 25px;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        position: relative;
    }
    label:hover {
      background: #f0f0f0;
    }
    input[type="checkbox"] {
        position: absolute;
        left: 3px;
        top: 2px;
    }
  `,
})
