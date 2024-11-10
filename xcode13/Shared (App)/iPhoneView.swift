//
//  iPhoneView.swift
//  LingLook
//
//  Created by Phong Phan on 11/9/24.
//


import SwiftUI

struct iPhoneView: View {
    @State private var currentPage = 0
    
    var body: some View {
        VStack(spacing: 20) {
            Image("LargeIcon")
                .resizable()
                .frame(width: 128, height: 128)
        }
        .padding()
    }
}

#if DEBUG
struct iPhoneView_Previews: PreviewProvider {
    static var previews: some View {
        iPhoneView()
    }
}
#endif
