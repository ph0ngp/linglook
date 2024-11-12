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
        .init(image: "ip1", title: String(localized: "step1")),
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
                            .shadow(radius: 10)
                            .padding(.top, PADDING)
                            .padding(.bottom, PADDING * 3) // for the index dot to be outside the image
                            .tag(index)
                    }
                }
                .frame(height: geometry.size.height * 2 / 3)
                .tabViewStyle(.page(indexDisplayMode: .always))
                .indexViewStyle(.page(backgroundDisplayMode: .always))

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
                    // .font(.title)
                    // }
                    // .padding(.bottom, 50)
                    // .multilineTextAlignment(.center)
                    // .fixedSize(horizontal: false, vertical: true)

                    Spacer()  // push the text to the top
                }
                .frame(
                    width: UIDevice.current.userInterfaceIdiom == .pad ? geometry.size.width * 2/3 : nil,
                    height: geometry.size.height * 1 / 3
                )
                // Spacer()
            }
        }
    }
}
