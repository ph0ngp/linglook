//
//  ContentView.swift
//  LingLook
//
//  Created by Phong Phan on 11/9/24.
//

#if os(iOS)
import SwiftUI

/// Paging Slider Data Model
struct Item: Identifiable {
    private(set) var id: UUID = .init()
    var image: String  // Image name from assets
    var title: String
    // var url: String?
}

/// Custom View
@available(iOS 17.0, *)
struct CustomPagingSlider<Content: View, TitleContent: View, Item: RandomAccessCollection>: View where Item: MutableCollection, Item.Element: Identifiable {
    /// Customization Properties
    var pageControlSpacing: CGFloat
    var showsIndicator: ScrollIndicatorVisibility = .hidden
    var titleItemSpacing: CGFloat
    var horizontalTopPadding: CGFloat
    var pageSpacing: CGFloat
    
    @Binding var data: Item
    @ViewBuilder var content: (Binding<Item.Element>) -> Content
    @ViewBuilder var titleContent: (Binding<Item.Element>) -> TitleContent
    /// View Properties
    @State private var activeID: UUID?
    var body: some View {
        VStack(spacing: pageControlSpacing) {
            ScrollView(.horizontal) {
                HStack(spacing: pageSpacing) {
                    ForEach($data) { item in
                        VStack(spacing: titleItemSpacing) {
                            titleContent(item)
                                .frame(maxWidth: .infinity)
                                .visualEffect { content, geometryProxy in
                                    content
                                        .offset(x: scrollOffset(geometryProxy))
                                }
                            
                            content(item)
                        }
                        .containerRelativeFrame(.horizontal)
                    }
                }
                /// Adding Paging
                .scrollTargetLayout()
            }
            .scrollIndicators(showsIndicator)
            .scrollTargetBehavior(.paging)
            .scrollPosition(id: $activeID)
            
            PagingControl(numberOfPages: data.count, activePage: activePage) { value in
                /// Updating to current Page
                if let index = value as? Item.Index, data.indices.contains(index) {
                    if let id = data[index].id as? UUID {
                        withAnimation(.snappy(duration: 0.35, extraBounce: 0)) {
                            activeID = id
                        }
                    }
                }
            }
        }
        .padding(.bottom)
        /// Use Safe Area Padding to avoid Clipping of ScrollView
        .safeAreaPadding([.horizontal, .top], horizontalTopPadding)
    }
    
    var activePage: Int {
        if let index = data.firstIndex(where: { $0.id as? UUID == activeID }) as? Int {
            return index
        }
        
        return 0
    }
    
    nonisolated func scrollOffset(_ proxy: GeometryProxy) -> CGFloat {
        let minX = proxy.bounds(of: .scrollView)?.minX ?? 0
        let titleScrollSpeed = 0.75 // up until 1.0
        
        return -minX * titleScrollSpeed
    }
}

/// Let's Add Paging Control
struct PagingControl: UIViewRepresentable {
    var numberOfPages: Int
    var activePage: Int
    var onPageChange: (Int) -> ()
    
    func makeCoordinator() -> Coordinator {
        return Coordinator(onPageChange: onPageChange)
    }
    
    func makeUIView(context: Context) -> UIPageControl {
        let view = UIPageControl()
        view.currentPage = activePage
        view.numberOfPages = numberOfPages
        view.backgroundStyle = .prominent
        view.currentPageIndicatorTintColor = UIColor(Color.primary)
        view.pageIndicatorTintColor = UIColor.placeholderText
        view.addTarget(context.coordinator, action: #selector(Coordinator.onPageUpdate(control:)), for: .valueChanged)
        return view
    }
    
    func updateUIView(_ uiView: UIPageControl, context: Context) {
        /// Updating Outside Event Changes
        uiView.numberOfPages = numberOfPages
        uiView.currentPage = activePage
    }
    
    class Coordinator: NSObject {
        var onPageChange: (Int) -> ()
        init(onPageChange: @escaping (Int) -> Void) {
            self.onPageChange = onPageChange
        }
        
        @objc
        func onPageUpdate(control: UIPageControl) {
            onPageChange(control.currentPage)
        }
    }
}

#endif