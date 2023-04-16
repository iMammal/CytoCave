This is the NeuroCave 3D brain visualization tool demo! This tool provides a 
unique and interactive way to explore brain regions and their connectivity. It is currently
undergoing a generalization to allow the exploration . Neurogenomics and general genomics 
datasets. Here are some of the new generalized features:

![Independent Glyph Slider Control - zoom in - Sync - demo sliders](BrainGlyphs.gif)

Independent glyph size control for left and right view windows allows 
users to adjust the size of the cube and sphere glyphs independently for the left 
and right view windows. This is particularly useful when comparing brain regions or 
when focusing on a specific hemisphere.

![Independent Hemiphere Edge Display Thresholds - select some nodes - Edge checkboxes and Sliders](BrainEdges.gif)

Independent control of ipsilateral and contralateral connectivity edge display 
toggle and threshold allows users to control the visibility of ipsilateral 
and contralateral connectivity edges separately. Users can also set a threshold for 
edge display, allowing them to focus on the mos t significant connections.

![Independent Region Color Visibility - Unlock Left ColorCoding and click regions and dropdown](BrainRegions.gif)

Independent control of region color visibility for left and right view window - 
users can set the visibility of brain region colors separately for the left and 
right view windows. This allows them to highlight specific brain regions and their 
connectivity.
---
![Search bar - search for Cingu a few times](BrainSearch.gif)

Search bar to search for brain region of interest and display its connections allows users to search for a specific brain region or gene of interest 
and display its connections. This feature can help users focus on specific brain 
regions and their connectivity.
---
![Animation amplitude and frequency control for pulsing and Flashing - adjust Animation and Flash Sliders](BrainAnim.gif)

Animation amplitude and frequency control for pulsing and flashing of selected and 
connected nodes provides animation control features, allowing users to 
adjust the amplitude and frequency of pulsing and flashing for selected and 
connected nodes. This can help highlight important brain regions and their connections. 
Selected and connected nodes, highlighted by pulsing or flashing, are still visible
when edge lines are removed with the Opacity slider.

Overall, the NeuroCave 3D brain visualization tool provides a comprehensive and 
interactive way to explore brain regions and their connectivity.

![Allen Brain Institute Neurogenomics MicroArray Dataset - open Allen demo - zoom - sync - spin](AllenGenomics.gif)

The original NeuroCave connectomics visualization tool provides a powerful means of 
exploring brain connectome data with its 3D representation of brain regions as spheres 
and cubes for the two hemispheres 
and their connections as edges. Building on this foundation, we generalized NeuroCave to 
visualize neurogenomic and genomics datasets by incorporating additional features 
such as independent glyph scaling control, side-by-side window display, and independent 
color coding. 

![Allen Neurogenomics Glyph Scaling - unlock sliders - demo adjustment](AllenGlyphs.gif)

- Independent glyph scaling control sliders for spheres and cubes, including the decoupled 
left and right window glyph size sliders, allow the adjustment for point density difference 
and scale differences between two different datasets, simultaneously visualized in the two windows.

![Decoupling the color code selector for Allen Neurogenomics - Unlock Regions](AllenRegions.gif)

-  Decoupling the color code selector in the two windows enable a few use cases:

	![Allen Brain Color Coding Degree Anatomy - choose degree on right - toggle regions - sync](AllenDegree.gif)

	- different color codings of the same dataset, for example, in the brain, anatomical regions can be 
	color coded on the left and connection degree range can be color coded on the right, to study 
	connectivity degree variations throughout a range of brain regions. Dual faceted views allow for selection
   of specific regions and their connections in each window, under one color coding, and the selection is linked 
   between the two windows, visible under the other color coding, allowing for the exploration of the intersection
   of the two color codings.

	![Allen Gene Color Coding - switch to gene tab](AllenGeneCentrality.gif)

	- displaying different colorings of genomic datasets, like gene networks, allows the user to draw 
	correlations between metrics such as gene Module Membership and gene centrality 
	
	![Allen Color Gene Brain Intermodal - in first tab select Genes Coords - select colors](AllenIntermodal.gif)

	- displaying different complementary datasets in each window, with linked selection and edge display, 
	between them allows for intermodal exploration of networks such as brain connectome on one side and gene 
	network on the other. Different color codings can be applied to each view window, each tailored to its 
	own specific dataset in that window.

![Allen Search Bar - search brain regions - search genes](AllenSearch.gif)

- The search bar can be used to locate a specific brain region or gene of interest, and its connections 
or correlated regions can be highlighted in the visualization.

![Allen Animation - keep searching - adjust animation and flash rate - adjust opacity](AllenAnimations.gif)

- Animation controls can be used to highlight a specific gene or brain region and its connections by pulsing 
or flashing its sphere and edges, allowing for easy identification and visualization of important genes or 
brain regions, especially useful when using search bar. Edge lines can be removed with Opacity slider when 
connected nodes are animated.

![Allen Edge Display - play with edge visibility controls](AllenEdges.gif)

- The intragroup and intergroup (or ipsilateral and contralateral) connectivity edge display toggle and threshold 
can be adjusted to explore 
the connectivity pattern between brain regions and genes. For example, the threshold can be set to display only 
the strongest connections between brain regions and genes, or to explore the overall connectivity pattern within 
the dataset.

![Allen Single Cell Omics - switch to omics tab and play around](AllenOmics.gif)

- Large-scale spatial or single-cell omics studies can also be visualized in the same way. Using a 3D tSNE embedding of 
the cells, instead of brain regions, for the 3D node positions, with cells represented as spheres, and the genes as cubes,
both grouped based on their expression profilew, allow for the exploration of non-spacial gene expression patterns and 
cell types within the dataset. 
The independent glyph size and color coding control can be used to adjust for differences in point density and scale, 
in comparing and contrasting different aspects of the single-cell or microdissection data across different regions 
of the 3D embedding.

![Allen Neurogenomics Heirachical Clustering Display with 3D Platonic Solid]()

- The 3D platonic solid-based representation of clustering data can provide a means of
exploring the hierarchical clustering of cell relationships, neuronal circuits, or
gene networks.

![Allen Neurogenomics Overall Interactive Visualization](AllenNeuroGenomics.gif)

Overall, the Neurocave 3D brain visualization tool provides a powerful platform to explore and analyze complex 
neurogenomic datasets by visualizing brain regions and genes in 3D space and allowing for easy comparison and 
exploration of different datasets and color codings. The decoupled control of glyph size, color coding, and 
edge display controls provide users with the ability to customize the visualization to their specific 
research needs while the search bar and animation controls provide a means of highlighting specific genes or 
brain regions of interest. 

Here are a few possible use cases for the NeuroCave 3D brain visualization tool:

- Explore the connectivity pattern of brain regions and genes in 3D space, with the ability to highlight
	 lncRNA and mRNA expression patterns in the brain, alongside genes or brain regions of interest.

- Compare clustering algorithms such as csuWGCNA and regular WGCNA on the same dataset, exploring the 
	 differences in the clustering results and the gene modules identified by each algorithm.

- Explore the connectivity patterns of genes in 3D space, using different connectivity 
    matricies, derived from different types of data, such as gene expression, protein-protein interaction,
	or KEGG pathway data.