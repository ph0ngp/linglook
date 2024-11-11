#if os(iOS)
import SwiftUI

struct FallbackPagingSlider<Content: View, TitleContent: View, Item: RandomAccessCollection>: View where Item: MutableCollection, Item.Element: Identifiable {
    var pageControlSpacing: CGFloat
    var titleItemSpacing: CGFloat
    var horizontalTopPadding: CGFloat
    var pageSpacing: CGFloat
    
    @Binding var data: Item
    @ViewBuilder var content: (Binding<Item.Element>) -> Content
    @ViewBuilder var titleContent: (Binding<Item.Element>) -> TitleContent
    
    @State private var currentPage: Int = 0
    
    var body: some View {
        VStack(spacing: pageControlSpacing) {
            TabView(selection: $currentPage) {
                ForEach(Array(data.enumerated()), id: \.element.id) { index, _ in
                    VStack(spacing: titleItemSpacing) {
                        titleContent($data[data.index(data.startIndex, offsetBy: index)])
                        content($data[data.index(data.startIndex, offsetBy: index)])
                    }
                    .padding(.horizontal, pageSpacing/2)
                    .tag(index)
                }
            }
            // .frame(height: frameHeight)
            .tabViewStyle(.page(indexDisplayMode: .never))
            
            HStack(spacing: 10) {
                ForEach(0..<data.count, id: \.self) { index in
                    Circle()
                        .fill(currentPage == index ? Color.primary : Color.gray.opacity(0.5))
                        .frame(width: 8, height: 8)
                }
            }
        }
        .padding(.bottom)
        .padding([.horizontal, .top], horizontalTopPadding)
    }
}
#endif
