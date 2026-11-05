import type { Group, Object3D } from 'three'
import { applyObjectPresence } from './objectPresence'
import type { TransformControls } from 'three-stdlib'
let current:TransformControls|null=null
let outline:Object3D|null=null
export function setEditorOutline(object:Object3D|null){outline=object}
export function applyEditorPresence(active:boolean){if(current){applyObjectPresence(current as unknown as Group,active);(current as unknown as {enabled:boolean}).enabled=active}if(outline)applyObjectPresence(outline as Group,active)}
export function setEditorControls(control:TransformControls){current=control}
export function releaseEditorControls(control:TransformControls|null){if(current===control)current=null}
/** Native TransformControls and R3F share the canvas. Do not select a mesh behind an axis. */
export function transformOwnsPointer(){const c=current as unknown as {enabled:boolean;visible:boolean;dragging:boolean;axis:string|null}|null;return !!c?.enabled&&c.visible&&(c.dragging||c.axis!==null)}
