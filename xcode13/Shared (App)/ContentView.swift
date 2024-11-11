//
//  ContentView.swift
//  LingLook
//
//  Created by Phong Phan on 11/9/24.
//

import SwiftUI

#if os(iOS)
struct ContentView: View {
    /// View Properties
    @State private var items: [Item] = [
        .init(image: "ip1", title: String(localized: "step1")),
        .init(image: "ip2", title: String(localized: "step2")),
        .init(image: "ip3", title: String(localized: "step3")),
        .init(image: "ip4", title: String(localized: "step4")),
        .init(image: "ip5", title: String(localized: "step5")),
        .init(image: "ip6", title: String(localized: "step6")),
        .init(image: "ip7", title: String(localized: "step7")),
        .init(image: "ip8", title: String(localized: "step8"))
    ]
    /// Customization Properties
    @State private var titleItemSpacing: CGFloat = 30
    @State private var horizontalTopPadding: CGFloat = 30
    @State private var pageSpacing: CGFloat = 10
    @State private var pageControlSpacing: CGFloat = 20
    // @State private var useModernSlider: Bool = true  // Add this new state

    var body: some View {
        // if UIDevice.current.userInterfaceIdiom == .pad {
        //     iPadView()
        // } else {
        //     iPhoneView()
        // }
        fallbackSlider
        // if #available(iOS 17, *), UIDevice.current.userInterfaceIdiom == .phone {
        //     if useModernSlider {
        //         modernSlider
        //     } else {
        //         fallbackSlider
        //     }
        //     Toggle("Use Modern Slider", isOn: $useModernSlider)
        //         .padding(.horizontal)
        //     // List {
        //     //     Toggle("Show Paging Control", isOn: $showPagingControl)
                
        //     //     Toggle("Disable Page Interaction", isOn: $disablePagingInteraction)
                
        //     //     Toggle("Stretch Content", isOn: $stretchContent)
                
        //     //     Section("Title Scroll Speed") {
        //     //         Slider(value: $titleScrollSpeed)
        //     //     }
                
        //     //     Section("Paging Spacing") {
        //     //         Slider(value: $pagingSpacing, in: 20...40)
        //     //     }
        //     // }
        //     // .clipShape(.rect(cornerRadius: 15))
        //     // .padding(15)
        // } else {
        //     fallbackSlider
        // }
    }
    
    @available(iOS 17, *)
    @ViewBuilder
    var modernSlider: some View {
        CustomPagingSlider(
            pageControlSpacing: pageControlSpacing,
            titleItemSpacing: titleItemSpacing,
            horizontalTopPadding: horizontalTopPadding,
            pageSpacing: pageSpacing,
            data: $items
        ) { $item in
            SliderContent(item: $item)
        } titleContent: { $item in
            SliderTitleContent(item: $item)
        }
    }

        
    @ViewBuilder
    var fallbackSlider: some View {
        FallbackPagingSlider(
            pageControlSpacing: pageControlSpacing,
            titleItemSpacing: titleItemSpacing,
            horizontalTopPadding: horizontalTopPadding,
            pageSpacing: pageSpacing,
            data: $items
        ) { $item in
            SliderContent(item: $item)
        } titleContent: { $item in
            SliderTitleContent(item: $item)
        }
    }
}

struct SliderContent: View {
    @Binding var item: Item
    
    var body: some View {
        // if let url = item.url {
        //     WebView(urlString: url)
        //         .frame(maxWidth: .infinity, maxHeight: .infinity)
        //         .aspectRatio(3/4, contentMode: .fit)
        //         .clipShape(RoundedRectangle(cornerRadius: 15))
        // } else {
            RoundedRectangle(cornerRadius: 15)
                .fill(.clear)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .aspectRatio(3/4, contentMode: .fit)
                .overlay {
                Image(item.image + String(localized: "lang_code"))
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            }
            .clipped()
        // }
    }
}

struct SliderTitleContent: View {
    @Binding var item: Item
    
    var body: some View {
        Text(item.title)
            // .font(.headline)
            // .bold()
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal)
            .frame(height: 100)
    }
}
#else
struct ContentView: View {
    var body: some View {
        MacView()
    }
}
#endif