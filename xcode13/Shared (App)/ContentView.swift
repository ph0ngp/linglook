//
//  ContentView.swift
//  LingLook
//
//  Created by Phong Phan on 11/9/24.
//

import SwiftUI

struct Item: Identifiable {
    private(set) var id: UUID = .init()
    var image: String
    var title: String
}

struct ContentView: View {
    let items: [Item] = [
        .init(image: "ip1", title: String(localized: "step1") + (UIDevice.current.userInterfaceIdiom == .phone ? "" : String(localized: "device_note"))),
        .init(image: "ip2", title: String(localized: "step2")),
        .init(image: "ip3", title: String(localized: "step3")),
        .init(image: "ip4", title: String(localized: "step4")),
        .init(image: "ip5", title: String(localized: "step5")),
        .init(image: "ip6", title: String(localized: "step6")),
        .init(image: "ip7", title: String(localized: "step7")),
        .init(image: "ip8", title: String(localized: "step8")),
    ]

    let PADDING: CGFloat = 20

    @State private var currentPage = 0

    init() {
        // Customize page control dots appearance
        UIPageControl.appearance().currentPageIndicatorTintColor = UIColor.label  // System primary color
        UIPageControl.appearance().pageIndicatorTintColor = UIColor.systemGray.withAlphaComponent(
            0.5)
    }

    var body: some View {
        GeometryReader { geometry in
            VStack(alignment: .center, spacing: PADDING) {
                TabView(selection: $currentPage) {
                    ForEach(0..<items.count, id: \.self) { index in
                        Image(items[index].image + String(localized: "lang_code"))
                            .resizable()
                            .scaledToFit()  // make it fit the outer container, whose height we have specified
                            .cornerRadius(15)
                            .shadow(color: .primary.opacity(0.5), radius: 8)
                            .padding(.top, PADDING)
                            .padding(.bottom, PADDING * 3) // for the index dot to be outside the image
                            .tag(index)
                            // .border(Color.blue)
                    }
                }
                .frame(height: geometry.size.height * 2 / 3)
                .tabViewStyle(.page(indexDisplayMode: .always))
                .indexViewStyle(.page(backgroundDisplayMode: .always))
                // .border(Color.green)

                // HStack(spacing: 8) {
                //     ForEach(0..<items.count, id: \.self) { index in
                //         Circle()
                //             .fill(currentPage == index ? Color.primary : Color.gray.opacity(0.5))
                //             .frame(width: 8, height: 8)
                //     }
                // }

                // ScrollView(.vertical) {
                VStack {
                    Text(items[currentPage].title)
                        .padding(.horizontal, PADDING)
                    // .border(Color.orange)
                    // .font(.title)
                    // }
                    // .padding(.bottom, 50)
                    // .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true) // ensure that the text will expand vertically as needed to show all content (not truncated by ...) while still respecting horizontal constraints. This is in case very small screen device like iPhone SE (4 inch screen)
                    Spacer()  // push the text to the top
                }
                .frame(
                    //this must not be too low because when phone is in landscape mode, there will be limited height.
                    maxWidth: 600
                    // maxHeight: geometry.size.height * 1 / 3
                )
                // .border(Color.red)
                // Spacer()
            }
            // .border(Color.yellow)
        }
    }
}
