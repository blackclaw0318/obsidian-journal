# 上坤虚拟形象 v2

## 资源与生成方式

- 外观原稿：`public/images/avatar-v2-concept.png`；网页备用图为同名 WebP。
- 兼容原有预览地址：`public/images/avatar-poster.png` 和 WebP。
- 备用表情图：`public/images/avatar-v2-wink.webp`、`avatar-v2-thinking.webp`。
- 实际三维模型：`public/models/avatar-v2.glb`，6.22 MB、130,936 个三角面。
- 三维表情贴图：`public/models/avatar-v2-{natural,wink,thinking}.webp`。

外观与表情使用内置 `image_gen` 生成，未使用 CLI/API fallback。输入仅为用户提供的形象参考图，不包含内网数据。

网格由官方 [TripoSR](https://github.com/VAST-AI-Research/TripoSR) 权重在本机 Apple MPS 上重建，提取 384³ 密度场，经 Blender 简化。正面用校准后的原图纹理投射，背面使用模型推断的颜色，耳饰十字架补充为实际几何体。代码与权重采用 MIT，许可证随模型保存。模型已重新导入并渲染检查。

这是有真实表面与厚度的单视图重建，不能等同于人工完成的完整角色雕刻或面部骨骼绑定。正面细节接近外观原稿，推断的侧后方和辫发/道具边缘仍有局限。网页因此限制到正面附近的小角度转动，表情通过匹配的贴图切换实现。

## Three.js 约定

- 正面 +Z，上方 +Y；高度归一化到 3.35，底部置 y=0。
- 参考相机 `(0, 1.66, 6.3)`，看向 `(0, 1.66, 0)`，按画布比例调整 FOV。
- `Front source reprojection` 材质换表情图；`flipY=false`、`SRGBColorSpace`。
- 原图已有光照，前后 unlit 材质设 `toneMapped=false`，避免二次色调映射。
- 模型未加载或 WebGL 不可用时，保留同表情的透明备用图和全部经历内容。
- 页面离开时清理画布、纹理、材质、几何体、观察器与事件；后台或屏幕外暂停绘制。

## 生成提示词

基础外观（内置工具，透明背景）：

> Use case: identity-preserve, premium stylized-concept character asset. Input image is the sole identity/design reference, NOT the crude earlier model. Recreate THIS EXACT handsome young Asian male avatar as a beautifully crafted high-end 3D animated-film character portrait for his professional personal website. Identity fidelity is the highest priority: the same attractive tapered oval face and defined narrow chin, normal short neck, large but natural almond-shaped dark brown eyes with warm expressive gaze, dark upper eyelids, thick straight dark eyebrows, small delicately sculpted natural nose, same ears and asymmetrical silver jewelry (small hoop on his right, dangling cross on his left), warm tan skin with subtle blush. Preserve the distinctive black outward-fanning TWIST BRAIDS with visible interlocking ridged braided structure, shaved close-cut sides and clean hairline, a few braids leaning over the forehead. Hair must sweep outwards as in reference, never straight-down mushroom bangs or gray spaghetti. Preserve the charcoal gray woven Polo shirt with normal-sized collar. Preserve the fun original composition: holding a glossy red apple in the hand at image left, a slice of bread held gently between lips, holding a dark smartphone upright near his cheek on image right, slender correctly articulated fingers. Produce a polished premium 3D SCULPT RENDER with tactile woven fabric, rich black hair, warm skin subsurface scattering, clear glossy brown eyes, refined real facial anatomy stylized elegantly, subtle soft studio key light and soft fill, handsome confident relaxed expression. Chest-up portrait, near front view, same face proportions as reference, entire hair, both hands and props visible with generous transparent padding at all sides. Clean TRUE TRANSPARENT alpha background, no environment, no backdrop, no ground, no lettering, no frame or labels, no watermark. This must resemble the reference very closely and be dramatically more beautiful than a primitive procedural toy: no elongated potato head, no long tube nose, no bulging round eyes, no giant collar, no ball shoulders, no tubular arms, no long neck, no plastic mannequin appearance. Final look should be a professional animated-film digital double of the supplied reference, carefully art-directed and highly finished.

眨眼变体（同一外观作为编辑输入，透明背景）：

> Edit target: the attached finished avatar portrait. Identity-preserve expression variant for the same website character. Change ONLY the expression to one playful gentle wink: his eye on the RIGHT side of the image closes naturally with a refined curved eyelid, the other warm brown eye remains open and friendly. Make a very subtle corresponding cheek lift and brow relaxation. Keep absolutely everything else identical, including the same face proportions, skin, hairstyle, every outward twist braid, head angle, lighting, gray Polo shirt, all fingers, red apple, bread held at lips, phone, earring and bracelet. No pose changes, no clothing changes, no additions, no camera/size/composition/crop changes. Preserve the finished premium 3D animated-film sculpt render quality. Exactly the same centered square composition, true transparent alpha background, no text, no watermark.

思考变体（同一外观作为编辑输入，透明背景）：

> Edit target: the attached finished avatar portrait. Identity-preserve expression variant for the same website character. Change ONLY the expression to a subtle curious thoughtful look: lift the eyebrow on the LEFT side of the image very slightly, angle both eyes' gaze gently towards image-left, lightly narrow eyelids with a thoughtful, attractive expression. No exaggerated cartoon bulging or face deformation. Keep absolutely everything else identical, including the same face proportions, skin, hairstyle, every outward twist braid, head angle, lighting, gray Polo shirt, all fingers, red apple, bread held at lips, phone, earring and bracelet. No pose changes, no clothing changes, no additions, no camera/size/composition/crop changes. Preserve premium 3D animated-film sculpt render quality. Exactly the same centered square composition, true transparent alpha background, no text, no watermark.
